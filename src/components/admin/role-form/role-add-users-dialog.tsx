"use client"

import { useEffect, useRef, useState, type RefObject } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Notice } from "@/components/ui/notice"
import { SearchField } from "@/components/ui/search-field"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"

export const MAX_PICK = 50

type Candidate = { id: string; displayName: string; username: string }
type ListedUser = Candidate & { isActive: boolean; userRoles: { roleId: string }[] }
type AddResult = { added: string[]; alreadyHeld: string[]; refused: { userId: string; reason: string }[] }

// เพิ่มผู้ใช้เข้าบทบาทนี้ (spec §7.3): the active accounts not in the role (GET /api/admin/users, fetched once per open),
// a search over name and login name, up to 50 ticks and an optional หมายเหตุ, then POST /api/admin/roles/[id]/users.
// The route checks each person as the user form does; the dialog then says how many were added, how many were already
// in the role (added by someone else meanwhile), and names each refusal with its reason in Thai (through the api-error
// catalog). The added and the already-held leave the list at once, and the page refreshes. No form element: the confirm
// is a button.
export function RoleAddUsersDialog({
  roleId,
  open,
  returnFocusRef,
  onClose,
}: {
  roleId: string
  open: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("adminRolesPage")
  const tCommon = useTranslations("common")
  const searchRef = useRef<HTMLInputElement | null>(null)
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<AddResult | null>(null)
  const [names, setNames] = useState<Map<string, string>>(() => new Map())

  useEffect(() => {
    if (!open || candidates !== null) return
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch("/api/admin/users")
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
        const users = ((payload?.data ?? []) as ListedUser[]).filter(
          (user) => user.isActive && !user.userRoles.some((userRole) => userRole.roleId === roleId),
        )
        if (cancelled) return
        setNames(new Map(users.map((user) => [user.id, user.displayName])))
        setCandidates(
          users
            .map((user) => ({ id: user.id, displayName: user.displayName, username: user.username }))
            .sort((left, right) => left.displayName.localeCompare(right.displayName, "th")),
        )
      } catch (error) {
        if (!cancelled) setLoadError(apiError.describe(error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, candidates, roleId, apiError, tCommon])

  function close() {
    setPicked(new Set())
    setNote("")
    setQuery("")
    setResult(null)
    // The list is read again on the next open: the people just added are no longer candidates.
    setCandidates(null)
    setLoadError(null)
    onClose()
  }

  function toggle(id: string) {
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_PICK) next.add(id)
      return next
    })
  }

  async function confirm() {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/roles/${roleId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [...picked], note: note.trim() || null }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      const done = payload as AddResult
      setResult(done)
      const gone = new Set([...done.added, ...done.alreadyHeld])
      setCandidates((current) => current?.filter((candidate) => !gone.has(candidate.id)) ?? null)
      setPicked(new Set())
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  const search = query.trim().toLowerCase()
  const shown = (candidates ?? []).filter(
    (candidate) => !search || candidate.displayName.toLowerCase().includes(search) || candidate.username.toLowerCase().includes(search),
  )

  return (
    <AccessibleDialog
      open={open}
      title={t("form.addUsers")}
      busy={saving}
      size="md"
      initialFocusRef={searchRef}
      returnFocusRef={returnFocusRef}
      onClose={close}
    >
      <AccessibleDialogBody className="grid gap-4">
        {result ? (
          <div role="status" className="grid gap-2">
            {result.added.length > 0 || (result.alreadyHeld.length === 0 && result.refused.length === 0) ? (
              <Notice tone="success">{t("form.addUsersDone", { count: result.added.length })}</Notice>
            ) : null}
            {result.alreadyHeld.length > 0 ? (
              <Notice tone="neutral">{t("form.addUsersAlreadyHeld", { count: result.alreadyHeld.length })}</Notice>
            ) : null}
            {result.refused.length > 0 ? (
              <Notice tone="warning" title={t("form.addUsersRefused", { count: result.refused.length })}>
                <ul className="grid gap-1">
                  {result.refused.map((refusal) => (
                    <li key={refusal.userId}>
                      <span className="font-medium text-foreground">{names.get(refusal.userId) ?? refusal.userId}</span>
                      {" · "}
                      {apiError.describe(refusal.reason).message}
                    </li>
                  ))}
                </ul>
              </Notice>
            ) : null}
          </div>
        ) : null}
        <SearchField
          ref={searchRef}
          aria-label={t("form.addUsersSearch")}
          placeholder={t("form.addUsersSearch")}
          value={query}
          maxLength={100}
          onChange={(event) => setQuery(event.target.value)}
        />
        <p className="num text-meta text-muted-foreground" role="status">{t("form.addUsersPicked", { count: picked.size })}</p>
        {loadError ? (
          <Notice tone="danger">{loadError}</Notice>
        ) : candidates === null ? (
          <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tCommon("noData")}</p>
        ) : (
          <ul className="grid max-h-72 gap-0.5 overflow-y-auto rounded-md border border-border p-1">
            {shown.map((candidate) => {
              const checked = picked.has(candidate.id)
              return (
                <li key={candidate.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-row-hover has-disabled:cursor-not-allowed has-disabled:text-faint-foreground">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={saving || (!checked && picked.size >= MAX_PICK)}
                      onChange={() => toggle(candidate.id)}
                      className={checkboxVariants()}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{candidate.displayName}</span>
                      <span className="block truncate text-meta text-muted-foreground"><span className="tag">{candidate.username}</span></span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
        <Field label={t("form.noteOptional")} id="role-add-users-note">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={saving}
            rows={2}
            maxLength={500}
            placeholder={t("form.notePlaceholder")}
          />
        </Field>
      </AccessibleDialogBody>
      <AccessibleDialogFooter>
        <AccessibleDialogCancel />
        <Button type="button" busy={saving} disabled={picked.size === 0} onClick={() => void confirm()}>
          {t("form.addUsersConfirm", { count: picked.size })}
        </Button>
      </AccessibleDialogFooter>
    </AccessibleDialog>
  )
}
