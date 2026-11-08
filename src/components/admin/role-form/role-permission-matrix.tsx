"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableHead, DataTableHeader, dataTableCellClasses, dataTableRowClasses } from "@/components/ui/data-table"
import { FieldError } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import type { RoleFormPermission } from "@/lib/role-form-data"
import { columnState, groupSummary, permissionMarks } from "@/lib/role-editor-model"
import { PERMISSION_ACTION_ORDER, PERMISSION_GROUPS, type PermissionGroupKey } from "@/lib/permission-groups"
import { cn } from "@/lib/utils"

// The group header row is a whole-row disclosure button (its N3 EXEMPT row), in a rowgroup header cell.
// The 40–44px target every matrix checkbox sits in (44 below md, 40 from md).
const TARGET = "relative inline-flex size-11 items-center justify-center rounded-md md:size-10 has-disabled:cursor-not-allowed"

function MatrixCheckbox({
  id,
  label,
  checked,
  indeterminate = false,
  disabled,
  title,
  className,
  onChange,
  children,
}: {
  id?: string
  label: string
  checked: boolean
  indeterminate?: boolean
  disabled: boolean
  title?: string
  className?: string
  onChange: () => void
  children?: ReactNode
}) {
  const ref = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <label className={cn(TARGET, className)} title={title}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className={checkboxVariants()}
      />
      {children}
    </label>
  )
}

// เลือกสิทธิ์ (spec §7.2; board US-Role-Edit): one table with one header row (the module, ทั้งแถว, then the actions in
// PERMISSION_ACTION_ORDER, each with "{selected}/{rows}" and a column checkbox; ลบ last in the warning tone). Each
// PERMISSION_GROUPS entry is a <tbody> whose first row folds it; a folded group's rows stay in the DOM, hidden, and its
// header row adds the per-action counts and the module names. A module row carries <span class="tag">{module}</span>
// (the E2E setup finds rows by it), the row checkbox with "{n}/6", and the six cells named "{action} {module}", with
// "(เพิ่มใหม่)" or "(เอาออก)" on a changed cell. Locked cells are disabled with a title that says why. The table scrolls
// sideways inside its own box on small screens.
export function RolePermissionMatrix({
  permissions,
  initial,
  current,
  isLocked,
  allLocked,
  isOpen,
  error,
  caption,
  onToggleGroup,
  onToggle,
  onSetMany,
}: {
  permissions: RoleFormPermission[]
  initial: ReadonlySet<string>
  current: ReadonlySet<string>
  isLocked: (key: string) => boolean
  allLocked: boolean
  isOpen: (group: PermissionGroupKey) => boolean
  error?: string
  caption: string
  onToggleGroup: (group: PermissionGroupKey) => void
  onToggle: (key: string) => void
  onSetMany: (keys: string[], on: boolean) => void
}) {
  const t = useTranslations("adminRolesPage")
  const tUsers = useTranslations("adminUsersPage")
  const actionName = (action: string) => (t.has(`actions.${action}`) ? t(`actions.${action}`) : action)
  const moduleName = (module: string) => (t.has(`modules.${module}`) ? t(`modules.${module}`) : module)

  const keySet = new Set(permissions.map((permission) => `${permission.module}:${permission.action}`))
  const modulesInUse = new Set(permissions.map((permission) => permission.module))
  const groups = PERMISSION_GROUPS.map((group) => ({ ...group, shown: group.modules.filter((module) => modulesInUse.has(module)) }))
  const shownModules = groups.flatMap((group) => group.shown)
  const rowKeysOf = (module: string) => PERMISSION_ACTION_ORDER.map((action) => `${module}:${action}`).filter((key) => keySet.has(key))
  const marks = permissionMarks(initial, current)
  const added = new Set(marks.added)
  const removed = new Set(marks.removed)
  // Focus for the permissions error: the first cell that can change.
  const orderedKeys = shownModules.flatMap(rowKeysOf)
  const focusKey = orderedKeys.find((key) => !isLocked(key)) ?? orderedKeys[0]

  const columns = PERMISSION_ACTION_ORDER.map((action) => {
    const keys = shownModules.map((module) => `${module}:${action}`).filter((key) => keySet.has(key))
    return {
      action,
      keys,
      rows: keys.length,
      selected: keys.filter((key) => current.has(key)).length,
      state: columnState(current, action, keys.map((key) => key.slice(0, key.indexOf(":")))),
    }
  })
  const columnCount = 2 + PERMISSION_ACTION_ORDER.length

  return (
    <ContentPanel
      divided
      flush
      className="overflow-hidden"
      title={t("form.matrixTitle")}
      description={allLocked ? t("permissionLockedSubtitle") : t("form.matrixHint")}
      actions={<span className="num text-meta text-muted-foreground">{t("form.selectedOf", { count: current.size, total: keySet.size })}</span>}
    >
      {/* The permissions are one group with one error above the table; focus goes to the first cell that can change (v-track M-R8). */}
      {error ? (
        <FieldError id="role-permissions-error" className="px-4 pt-3 md:px-5">{error}</FieldError>
      ) : null}
      <div
        id="role-permission-matrix"
        role="group"
        aria-label={t("permissionSelection")}
        aria-describedby={error ? "role-permissions-error" : undefined}
      >
        <DataTable framed={false} caption={caption}>
          <DataTableHeader>
            <tr>
              <DataTableHead className="sticky left-0 z-20 bg-surface">{t("module")}</DataTableHead>
              <DataTableHead className="text-center">{t("form.wholeRow")}</DataTableHead>
              {columns.map((column) => (
                <DataTableHead key={column.action} className={cn("px-1 text-center", column.action === "delete" && "text-warning")}>
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="font-medium">{actionName(column.action)}</span>
                    <span className="num">{column.selected}/{column.rows}</span>
                    <MatrixCheckbox
                      label={t("form.selectColumn", { action: actionName(column.action) })}
                      checked={column.state === "all"}
                      indeterminate={column.state === "some"}
                      disabled={allLocked || column.keys.every(isLocked)}
                      onChange={() => onSetMany(column.keys, column.state !== "all")}
                    />
                  </span>
                </DataTableHead>
              ))}
            </tr>
          </DataTableHeader>
          {groups.map((group) => {
            if (group.shown.length === 0) return null
            const open = isOpen(group.key)
            const summary = groupSummary(current, group.key)
            const perAction = PERMISSION_ACTION_ORDER.filter((action) => summary.byAction[action] > 0).map(
              (action) => `${actionName(action)} ${summary.byAction[action]}`,
            )
            return (
              <DataTableBody key={group.key} id={`role-group-${group.key}`}>
                <tr>
                  <th scope="rowgroup" colSpan={columnCount} className="border-b border-border bg-background p-0 text-left font-normal">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`role-group-${group.key}`}
                      onClick={() => onToggleGroup(group.key)}
                      className="flex min-h-11 w-full flex-wrap items-center gap-x-2 gap-y-0.5 px-4 py-2 text-left transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:px-5"
                    >
                      <ChevronRight aria-hidden="true" className={cn("size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-90")} />
                      <span className="font-semibold text-foreground">{tUsers(`form.group.${group.key}`)}</span>
                      <span className="num text-meta text-muted-foreground">
                        {t("form.groupLine", { modules: summary.modules, selected: summary.selected, total: summary.total })}
                        {!open && perAction.length > 0 ? ` · ${perAction.join(" · ")}` : null}
                      </span>
                      <span className="ml-auto text-meta font-medium text-primary">{open ? t("form.closeGroup") : t("form.openGroup")}</span>
                    </button>
                    {!open ? (
                      <p className="px-4 pb-2 pl-10 text-meta text-muted-foreground md:px-5 md:pl-11">{group.shown.map(moduleName).join(" · ")}</p>
                    ) : null}
                  </th>
                </tr>
                {group.shown.map((module) => {
                  const rowKeys = rowKeysOf(module)
                  const held = rowKeys.filter((key) => current.has(key)).length
                  const changed = rowKeys.some((key) => added.has(key) || removed.has(key))
                  return (
                    <tr key={module} hidden={!open} className={dataTableRowClasses}>
                      <td className={cn(dataTableCellClasses, "sticky left-0 z-10 bg-surface whitespace-nowrap")}>
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          {moduleName(module)}
                          {changed ? (
                            <span role="img" aria-label={t("form.changedRow")} title={t("form.changedRow")} className="size-2 shrink-0 rounded-full bg-primary" />
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground"><span className="tag">{module}</span></div>
                      </td>
                      <td className={cn(dataTableCellClasses, "py-1 align-middle")}>
                        <span className="flex items-center justify-center gap-1">
                          <MatrixCheckbox
                            label={t("form.selectRow", { module: moduleName(module) })}
                            checked={rowKeys.length > 0 && held === rowKeys.length}
                            indeterminate={held > 0 && held < rowKeys.length}
                            disabled={allLocked || rowKeys.every(isLocked)}
                            onChange={() => onSetMany(rowKeys, held !== rowKeys.length)}
                          />
                          <span className="num text-meta text-muted-foreground">{held}/{rowKeys.length}</span>
                        </span>
                      </td>
                      {PERMISSION_ACTION_ORDER.map((action) => {
                        const key = `${module}:${action}`
                        if (!keySet.has(key)) {
                          return (
                            <td key={action} className={cn(dataTableCellClasses, "px-1 py-1 text-center align-middle text-faint-foreground")}>
                              <span aria-hidden="true">–</span>
                            </td>
                          )
                        }
                        const locked = isLocked(key)
                        const isAdded = added.has(key)
                        const isRemoved = removed.has(key)
                        return (
                          <td key={action} className={cn(dataTableCellClasses, "px-1 py-1 text-center align-middle")}>
                            <CellCheckbox
                              id={key === focusKey ? "role-permissions" : undefined}
                              module={module}
                              action={action}
                              added={isAdded}
                              removed={isRemoved}
                              locked={locked}
                              checked={current.has(key)}
                              actionName={actionName}
                              moduleName={moduleName}
                              onToggle={() => onToggle(key)}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </DataTableBody>
            )
          })}
        </DataTable>
      </div>
    </ContentPanel>
  )
}

function CellCheckbox({
  id,
  module,
  action,
  added,
  removed,
  locked,
  checked,
  actionName,
  moduleName,
  onToggle,
}: {
  id?: string
  module: string
  action: string
  added: boolean
  removed: boolean
  locked: boolean
  checked: boolean
  actionName: (action: string) => string
  moduleName: (module: string) => string
  onToggle: () => void
}) {
  const t = useTranslations("adminRolesPage")
  const cellName = added ? "form.cellAdded" : removed ? "form.cellRemoved" : "form.cell"

  return (
    <MatrixCheckbox
      id={id}
      label={t(cellName, { action: actionName(action), module: moduleName(module) })}
      checked={checked}
      disabled={locked}
      title={locked ? t("form.lockedCell") : undefined}
      className={cn(added && "bg-success-soft", removed && "bg-danger-soft")}
      onChange={onToggle}
    >
      {added ? <span aria-hidden="true" className="absolute top-0.5 right-1 text-xs leading-none font-semibold text-success">+</span> : null}
      {removed ? <span aria-hidden="true" className="absolute top-0.5 right-1 text-xs leading-none font-semibold text-danger">−</span> : null}
    </MatrixCheckbox>
  )
}
